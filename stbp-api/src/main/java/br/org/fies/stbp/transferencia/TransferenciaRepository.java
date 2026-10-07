package br.org.fies.stbp.transferencia;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import br.org.fies.stbp.transferencia.TransferenciaDtos.Referencia;

public interface TransferenciaRepository
        extends JpaRepository<Transferencia, Long>, JpaSpecificationExecutor<Transferencia> {

    /** Usuários que já criaram transferências: opções do filtro "criado por". */
    @Query("""
            select distinct new br.org.fies.stbp.transferencia.TransferenciaDtos$Referencia(u.id, u.nome)
            from Transferencia t join t.criadoPor u
            order by u.nome
            """)
    List<Referencia> autores();
}
