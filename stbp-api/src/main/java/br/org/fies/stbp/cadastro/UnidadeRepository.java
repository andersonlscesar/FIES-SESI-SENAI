package br.org.fies.stbp.cadastro;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UnidadeRepository extends JpaRepository<Unidade, Long> {

    @EntityGraph(attributePaths = "instituicoes")
    List<Unidade> findAllByOrderByNome();

    Optional<Unidade> findByNomeIgnoreCase(String nome);

    @Query("select count(t) > 0 from Transferencia t where t.origem.id = :id or t.destino.id = :id")
    boolean usadaEmTransferencias(Long id);
}
