package br.org.fies.stbp.saida;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import br.org.fies.stbp.saida.SaidaDtos.Referencia;

public interface SaidaRepository extends JpaRepository<SaidaMaterial, Long>, JpaSpecificationExecutor<SaidaMaterial> {

    /** Usuários que já registraram saídas: opções do filtro "criada por". */
    @Query("""
            select distinct new br.org.fies.stbp.saida.SaidaDtos$Referencia(u.id, u.nome)
            from SaidaMaterial s join s.criadoPor u
            order by u.nome
            """)
    List<Referencia> autores();
}
